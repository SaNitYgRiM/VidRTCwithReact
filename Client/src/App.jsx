import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import Btn from './Components/Btn'
import RoomBtn from './Components/RoomBtn'



const configuration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
  iceCandidatePoolSize: 10,
}



function App() {
  const clientId = useRef(crypto.randomUUID())
  const [roomInfo, setRoomInfo] = useState('')
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [inputRoomId, setInputRoomId] = useState('')
  const [isCamActive, setIsCamActive] = useState(false)
  const [isMicActive, setIsMicActive] = useState(false)
  const [isRemoteConnected, setIsRemoteConnected] = useState(false)

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  const peerConnection = useRef(null)
  const localStream = useRef(null)
  const remoteStream = useRef(null)
  const currentRoomId = useRef(null)
  const sendSignal = async (
  roomId,
  type,
  payload
) => {
  await supabase.from('signals').insert({
    room_id: roomId,
    sender_id: clientId.current,
    type,
    payload,
  })
}

  const initPeerConnection = useCallback(() => {
  if (peerConnection.current) return

  peerConnection.current = new RTCPeerConnection(configuration)

  console.log('PeerConnection created')

  peerConnection.current.onconnectionstatechange = () => {
    console.log(
      'Connection State:',
      peerConnection.current.connectionState
    )
  }

  peerConnection.current.oniceconnectionstatechange = () => {
    console.log(
      'ICE Connection State:',
      peerConnection.current.iceConnectionState
    )
  }

  peerConnection.current.onicegatheringstatechange = () => {
    console.log(
      'ICE Gathering State:',
      peerConnection.current.iceGatheringState
    )
  }

  if (localStream.current) {
    localStream.current.getTracks().forEach((track) => {
      peerConnection.current.addTrack(
        track,
        localStream.current
      )
    })
  }

  peerConnection.current.addEventListener(
    'icecandidate',
    (event) => {
      if (
        event.candidate &&
        currentRoomId.current
      ) {
        sendSignal(
          currentRoomId.current,
          'candidate',
          {
            candidate: event.candidate,
          }
        )
      }
    }
  )

  peerConnection.current.addEventListener(
    'track',
    (event) => {
      if (!remoteStream.current) {
        remoteStream.current =
          new MediaStream()

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject =
            remoteStream.current
        }
      }

      event.streams[0]
        .getTracks()
        .forEach((track) => {
          const exists =
            remoteStream.current
              .getTracks()
              .some(
                (t) => t.id === track.id
              )

          if (!exists) {
            remoteStream.current.addTrack(
              track
            )
          }
        })

      setIsRemoteConnected(true)
    }
  )
},[])

 useEffect(() => {
  const roomsChannel = supabase
  .channel('rooms-watch')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'rooms',
    },
    async ({ new: room }) => {
      try {
        if (
          room.room_id !==
          currentRoomId.current
        )
          return

        if (
          room.host_id !==
          clientId.current
        )
          return

        if (!room.guest_id) return

        console.log(
          'Guest joined. Creating offer...'
        )

        initPeerConnection()

        const offer =
          await peerConnection.current.createOffer()

        await peerConnection.current.setLocalDescription(
          offer
        )

        await sendSignal(
          room.room_id,
          'offer',
          {
            sdp: offer,
          }
        )
      } catch (err) {
        console.error(err)
      }
    }
  )
  .subscribe()
  const channel = supabase
    .channel('webrtc-room')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'signals',
      },
      async ({ new: signal }) => {
        try {
          if (
            signal.room_id !==
            currentRoomId.current
          )
            return

          if (
            signal.sender_id === clientId.current
          )
            return

          switch (signal.type) {
            

            case 'offer': {
              console.log('Received offer')

              initPeerConnection()

              await peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(
                  signal.payload.sdp
                )
              )

              const answer =
                await peerConnection.current.createAnswer()

              await peerConnection.current.setLocalDescription(
                answer
              )

              await sendSignal(
                currentRoomId.current,
                'answer',
                {
                  sdp: answer,
                }
              )

              break
            }

            case 'answer': {
              console.log('Received answer')

              if (
                !peerConnection.current
              )
                return

              if (
                peerConnection.current
                  .remoteDescription
              )
                return

              await peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(
                  signal.payload.sdp
                )
              )

              break
            }

            case 'candidate': {
              if (
                !peerConnection.current
              )
                return

              await peerConnection.current.addIceCandidate(
                new RTCIceCandidate(
                  signal.payload.candidate
                )
              )

              break
            }
          }
        } catch (err) {
          console.error(err)
        }
      }
    )
    .subscribe()

  return () => {
  supabase.removeChannel(roomsChannel)
  supabase.removeChannel(channel)

  if (peerConnection.current) {
    peerConnection.current.close()
  }
}
}, [initPeerConnection])

  const openUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      localStream.current = stream

      setIsCamActive(true)
      setIsMicActive(true)
    } catch (err) {
      console.error('Camera permissions blocked:', err)
    }
  }



  const handleJoinRoomConfirm = async () => {
    if (!inputRoomId.trim()) return

    if (!localStream.current) {
      await openUserMedia()
    }

    currentRoomId.current = inputRoomId.trim()

    setRoomInfo(`Room: ${inputRoomId.trim()} (Callee)`)

    setShowJoinModal(false)

const { error } = await supabase
  .from('rooms')
  .update({
    guest_id: clientId.current,
  })
  .eq('room_id', inputRoomId.trim())
  .is('guest_id', null)

if (error) {
  console.error(error)
}
  }

  const toggleCamera = () => {
    if (!localStream.current) return

    const videoTrack = localStream.current.getVideoTracks()[0]

    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsCamActive(videoTrack.enabled)
    }
  }

  const toggleMic = () => {
    if (!localStream.current) return

    const audioTrack = localStream.current.getAudioTracks()[0]

    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMicActive(audioTrack.enabled)
    }
  }
const handleCreateRoom = async () => {
  if (!localStream.current) {
    await openUserMedia()
  }

  const generatedId =
    Math.random().toString(36).substring(2, 9)

  currentRoomId.current = generatedId

  setRoomInfo(`Room: ${generatedId} (Caller)`)

  const { error } = await supabase
    .from('rooms')
    .insert({
      room_id: generatedId,
      host_id: clientId.current,
    })

  if (error) {
    console.error(error)
  }
}
 const handleHangUp = async () => {
  if (currentRoomId.current) {
    await supabase
      .from('rooms')
      .delete()
      .eq('room_id', currentRoomId.current)
  }

  if (localStream.current) {
    localStream.current.getTracks().forEach((track) => track.stop())
  }

  if (remoteStream.current) {
    remoteStream.current.getTracks().forEach((track) => track.stop())
  }

  if (peerConnection.current) {
    peerConnection.current.close()
  }

  peerConnection.current = null
  localStream.current = null
  remoteStream.current = null
  currentRoomId.current = null

  if (localVideoRef.current) {
    localVideoRef.current.srcObject = null
  }

  if (remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = null
  }

  setRoomInfo('')
  setIsCamActive(false)
  setIsMicActive(false)
  setIsRemoteConnected(false)
}

  return (
    <div className="bg-violet-950 min-h-dvh w-full p-4 md:py-20 md:px-56 flex flex-col items-center justify-center text-fuchsia-50 relative">
      <div className="bg-indigo-950/70 border border-fuchsia-500/30 backdrop-blur-xl px-4 py-4 md:px-6 flex flex-col items-center justify-center w-full max-w-4xl h-full md:h-auto mx-auto rounded-2xl shadow-[0_0_50px_rgba(217,70,239,0.15)]">
        <div
          id="vidPlaceHolder"
          className="bg-slate-950 border border-indigo-500/20 w-full my-2 rounded-xl shadow-inner h-64 sm:h-80 md:h-96 relative overflow-hidden p-0"
        >
          <div
            className={`w-full h-full bg-black transition-opacity duration-500 ${
              isRemoteConnected
                ? 'opacity-100 z-0'
                : 'opacity-0 absolute pointer-events-none'
            }`}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold z-20">
              Remote User
            </span>
          </div>

          <div
            className={`bg-black overflow-hidden border transition-all duration-500 rounded-xl shadow-2xl ${
              isRemoteConnected
                ? 'absolute bottom-4 right-4 w-24 h-32 sm:w-32 sm:h-44 border-fuchsia-500/50 z-30'
                : 'w-full h-full border-slate-800 z-10'
            }`}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold">
              You
            </span>
          </div>
        </div>

        {roomInfo && (
          <span className="text-xs bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-300 font-mono tracking-wide my-2">
            {roomInfo}
          </span>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 p-2 w-full mt-2">
          <div className="order-2 md:order-1 w-full md:w-auto flex justify-center md:justify-start md:flex-1">
            <RoomBtn btnName="CREATE" onClick={handleCreateRoom} />
          </div>

          <div className="order-1 md:order-2 media-player-btns flex items-center gap-6 md:gap-8 justify-center w-full md:w-auto">
            <Btn
              btnName="CameraBtn"
              isActive={isCamActive}
              onClick={toggleCamera}
            />
            <Btn
              btnName="MicBtn"
              isActive={isMicActive}
              onClick={toggleMic}
            />
            <Btn btnName="hangUpBtn" onClick={handleHangUp} />
          </div>

          <div className="order-3 w-full md:w-auto flex justify-center md:justify-end md:flex-1">
            <RoomBtn
              btnName="JOIN"
              onClick={() => setShowJoinModal(true)}
            />
          </div>
        </div>
      </div>

      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-indigo-950 border border-fuchsia-500/40 p-6 rounded-2xl w-full max-w-sm shadow-[0_0_40px_rgba(217,70,239,0.2)]">
            <h3 className="text-base font-semibold tracking-wider text-fuchsia-300 mb-4">
              CONNECT TO CHANNEL
            </h3>

            <input
              type="text"
              placeholder="Enter active Room ID"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-indigo-500/30 text-fuchsia-50 mb-4 focus:outline-none focus:border-fuchsia-400 font-mono tracking-widest text-center"
            />

            <div className="flex justify-end gap-3 text-xs font-semibold tracking-wider">
              <button
                onClick={() => setShowJoinModal(false)}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                CANCEL
              </button>

              <button
                onClick={handleJoinRoomConfirm}
                className="px-5 py-2 bg-fuchsia-500 text-white rounded-xl shadow-[0_0_15px_rgba(217,70,239,0.4)] hover:bg-fuchsia-600 transition-colors cursor-pointer"
              >
                CONNECT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App