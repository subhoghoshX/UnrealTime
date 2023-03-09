import clsx from "clsx";
import { BsMicMute } from "react-icons/bs";
import Wave from "./Wave";

interface Props {
  stream: MediaStream;
  name: string;
  id: string;
  muted?: boolean;
  showMute: boolean;
  ssTrackId: string;
}

export default function Video({
  stream,
  name,
  id,
  muted,
  showMute,
  ssTrackId,
}: Props) {
  const initial = name.split("/")[0];
  name = name.split("/")[1];

  const screenShareTrack = stream?.getTrackById(ssTrackId);

  const camTrack = stream
    ?.getVideoTracks()
    .filter((track) => track.id !== ssTrackId)[0];

  return (
    <>
      <div className="relative aspect-video rounded bg-zinc-700/90">
        <video
          autoPlay
          className="h-full w-full -scale-x-100"
          ref={(elem) => {
            if (elem) {
              const camStream = new MediaStream();

              const audioTrack = stream?.getAudioTracks()[0];

              camTrack && camStream.addTrack(camTrack);
              audioTrack && camStream.addTrack(audioTrack);

              elem.srcObject = camStream;
            }
          }}
          muted={muted}
        ></video>
        {!camTrack && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="aspect-square h-1/3">
              <svg viewBox="0 0 18 18">
                <text x={4} y={15} fill="white">
                  {initial}
                </text>
              </svg>
            </span>
          </div>
        )}
        <p className="absolute bottom-2 left-3 font-bold text-white">{name}</p>
        <div className="absolute bottom-2 right-3 text-white">
          <div className={clsx({ hidden: !showMute })}>
            <BsMicMute />
          </div>
          <div className={clsx({ hidden: showMute })}>
            <Wave stream={stream} />
          </div>
        </div>
      </div>

      {screenShareTrack && (
        <div className="relative aspect-video">
          <video
            autoPlay
            className="h-full w-full rounded bg-zinc-700/90"
            ref={(elem) => {
              if (elem) {
                const screenShareStream = new MediaStream();
                screenShareStream.addTrack(screenShareTrack);
                elem.srcObject = screenShareStream;
              }
            }}
            muted={muted}
          ></video>
          <p className="absolute bottom-2 left-3 font-bold text-white">
            {name} (Sharing Screen)
          </p>
        </div>
      )}
    </>
  );
}
