import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Chat from "../components/Chat";
import negotiate from "../utils/negotiate";
import {
  BsCameraVideo,
  BsCameraVideoOff,
  BsMic,
  BsMicMute,
} from "react-icons/bs";
import { MdConnectedTv, MdOutlineScreenShare } from "react-icons/md";
import clsx from "clsx";
import MediaButton from "../components/Button/MediaButton";

const socket = io();

type Senders = {
  audio?: RTCRtpSender;
  video?: RTCRtpSender;
};

export default function Home() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localStreamSenders, setLocalStreamSenders] = useState<Senders | null>(
    null,
  );
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // initialize localStream, remoteStream & screenStream
  useEffect(() => {
    if (!remoteStream) {
      setRemoteStream(new MediaStream());
    }

    if (!localStream) {
      setLocalStream(new MediaStream());
    }

    if (!screenStream) {
      setScreenStream(new MediaStream());
    }
  }, []);

  // Peer Connection
  const [pc, setPc] = useState<RTCPeerConnection>();

  useEffect(() => {
    if (!pc) {
      setPc(
        new RTCPeerConnection({
          iceServers: [
            {
              urls: [
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
              ],
            },
          ],
        }),
      );
    }
  }, []);

  // Signalling Client
  useEffect(() => {
    if (pc) {
      socket.on("offer-event", async (offer) => {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        if (offer.type === "offer") {
          console.log("receive offer => ", offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("offer-event", answer);
          console.log("send answer => ", answer);
        }

        if (offer.type === "answer") {
          console.log("received answer => ", offer);
        }
      });

      socket.on("new-ice-candidate", (message) => {
        console.log("iceCAndiate =>", message);
        pc.addIceCandidate(new RTCIceCandidate(message));
      });
    }
  }, [pc]);

  // Attach listeners on the Peer connection
  useEffect(() => {
    if (!pc) return;

    pc.ontrack = (event) => {
      const tempStream = new MediaStream();
      event.streams[0].getTracks().forEach((track) => {
        tempStream?.addTrack(track);

        const videos = remoteStream?.getVideoTracks();
        if (videos?.length === 2) {
          screenStream?.addTrack(videos[1]);
        }
      });
      setRemoteStream(tempStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("new-ice-candidate", event.candidate.toJSON());
      }
    };

    pc.onnegotiationneeded = () => {
      negotiate(pc, socket);
    };
  }, [pc]);

  async function getCamera() {
    if (!pc) {
      return;
    }
    const videoStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    videoStream.getTracks().forEach((track) => {
      localStream?.addTrack(track);
      const sender = pc.addTrack(track, videoStream);
      setLocalStreamSenders((localStreamSenders) => ({
        ...localStreamSenders,
        video: sender,
      }));
    });
  }

  useEffect(() => {
    if (videoEnabled) {
      getCamera();
    } else {
      if (localStreamSenders?.video) {
        pc?.removeTrack(localStreamSenders?.video);
      }
    }
  }, [videoEnabled]);

  async function getAudio() {
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    audioStream.getTracks().forEach((track) => {
      localStream?.addTrack(track); // maybe not necessary, as it'll be muted anyway
      const sender = pc?.addTrack(track, audioStream);
      setLocalStreamSenders((localStreamSenders) => ({
        ...localStreamSenders,
        audio: sender,
      }));
    });
  }

  useEffect(() => {
    if (audioEnabled) {
      getAudio();
    } else {
      if (localStreamSenders?.audio) {
        pc?.removeTrack(localStreamSenders.audio);
      }
    }
  }, [audioEnabled]);

  async function connect() {
    if (!pc) {
      return;
    }

    negotiate(pc, socket);
  }

  async function shareScreen() {
    const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    screenCaptureStream.getTracks().forEach((track) => {
      screenStream?.addTrack(track);
      pc?.addTrack(track, screenCaptureStream);
    });
  }

  return (
    <div>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex h-screen justify-between bg-zinc-900">
        <div className="flex flex-grow flex-col p-5">
          <section className="grid flex-grow grid-cols-3 items-start gap-4">
            <div className="aspect-video">
              <video
                autoPlay
                className="h-full w-full -scale-x-100 rounded bg-red-500"
                ref={(elem) => {
                  if (elem) {
                    elem.srcObject = localStream;
                  }
                }}
                muted
              ></video>
            </div>
            <div className="aspect-video">
              <video
                autoPlay
                className="h-full w-full -scale-x-100 rounded bg-green-500"
                ref={(elem) => {
                  if (elem) {
                    elem.srcObject = remoteStream;
                  }
                }}
              ></video>
            </div>
            <div className="aspect-video">
              <video
                autoPlay
                className="h-full w-full rounded bg-blue-500"
                ref={(elem) => {
                  if (elem) {
                    elem.srcObject = screenStream;
                  }
                }}
              ></video>
            </div>
          </section>

          <menu className="flex justify-center gap-3">
            <MediaButton
              enabled={videoEnabled}
              onClick={() => setVideoEnabled((videoEnabled) => !videoEnabled)}
              DisabledIcon={BsCameraVideoOff}
              EnabledIcon={BsCameraVideo}
              type="primary"
            />
            <MediaButton
              enabled={audioEnabled}
              onClick={() => setAudioEnabled((audioEnabled) => !audioEnabled)}
              DisabledIcon={BsMicMute}
              EnabledIcon={BsMic}
              type="primary"
            />
            <MediaButton
              onClick={connect}
              Icon={MdConnectedTv}
              type="secondary"
            />
            <MediaButton
              onClick={shareScreen}
              Icon={MdOutlineScreenShare}
              type="secondary"
            />
          </menu>
        </div>

        <div className="shrink-0">
          <Chat socket={socket} />
        </div>
      </div>
    </div>
  );
}
