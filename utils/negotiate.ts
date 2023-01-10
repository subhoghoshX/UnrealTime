import { Socket } from "socket.io-client";

export default async function negotiate(pc: RTCPeerConnection, socket: Socket) {
  const offer = await pc.createOffer();

  await pc.setLocalDescription(offer);

  socket.emit("offer-event", offer);

  console.log("send offer => ", offer);
}
