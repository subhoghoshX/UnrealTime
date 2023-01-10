import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Chat from "../components/Chat";

const socket = io();

let localStream: MediaStream;
let remoteStream: MediaStream;

export default function Home() {
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
        // console.log("offer => ", offer);
        // console.log("type => ", pc.remoteDescription, pc);
      });

      // ice candiates
      socket.on("new-ice-candidate", (message) => {
        console.log("iceCAndiate =>", message);
        // console.log(new RTCIceCandidate(message.candidate));
        pc.addIceCandidate(new RTCIceCandidate(message));
      });
    }
  }, [pc]);

  const localVideoRef = useRef<null | HTMLVideoElement>(null);
  const remoteVideoRef = useRef<null | HTMLVideoElement>(null);
  const screenCaptureVideoRef = useRef<null | HTMLVideoElement>(null);

  async function getMedia() {
    if (!pc) {
      return;
    }
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    remoteStream = new MediaStream();

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);

        if (screenCaptureVideoRef.current) {
          const screenCaptureStream = new MediaStream();
          const videos = remoteStream.getVideoTracks();
          if (videos.length === 2) {
            screenCaptureStream.addTrack(videos[1]);
            screenCaptureVideoRef.current.srcObject = screenCaptureStream;
          }
        }
      });
      // remoteStream = track.streams[0];
    };

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }

  async function connect() {
    if (!pc) {
      return;
    }

    pc.onicecandidate = (event) => {
      // console.log("ice candidate => ", event.candidate);
      if (event.candidate) {
        socket.emit("new-ice-candidate", event.candidate.toJSON());
      }
    };

    const offer = await pc.createOffer();
    // fuck await
    await pc.setLocalDescription(offer);

    socket.emit("offer-event", offer);

    console.log("send offer => ", offer);
  }

  async function shareScreen() {
    const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    screenCaptureStream.getTracks().forEach((track) => {
      pc?.addTrack(track, screenCaptureStream);
    });

    if (screenCaptureVideoRef.current) {
      screenCaptureVideoRef.current.srcObject = screenCaptureStream;
    }
  }

  return (
    <div>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex h-screen justify-between">
        <div>
          <video
            autoPlay
            className="-scale-x-100 bg-red-500"
            ref={localVideoRef}
            muted
          ></video>
          <video
            autoPlay
            className="-scale-x-100 bg-green-500"
            ref={remoteVideoRef}
          ></video>
          <video
            autoPlay
            className="bg-pink-500"
            ref={screenCaptureVideoRef}
          ></video>
          <button className="bg-blue-500 px-4 py-2" onClick={getMedia}>
            Cam & Audio
          </button>
          <button className="bg-indigo-500 px-4 py-2" onClick={connect}>
            Connect
          </button>
          <button className="bg-pink-500 px-4 py-2" onClick={shareScreen}>
            Share Screen
          </button>
        </div>

        <Chat socket={socket} />
      </div>
    </div>
  );
}
