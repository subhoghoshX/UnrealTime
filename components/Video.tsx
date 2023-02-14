import clsx from "clsx";
import { BsMicMute } from "react-icons/bs";
import Wave from "./Wave";

interface Props {
  stream: MediaStream;
  name: string;
  id: string;
  muted?: boolean;
  showMute: boolean;
}

export default function Video({ stream, name, id, muted, showMute }: Props) {
  return (
    <div className="relative aspect-video">
      <video
        autoPlay
        className="h-full w-full -scale-x-100 rounded bg-zinc-700/90"
        ref={(elem) => {
          if (elem) {
            elem.srcObject = stream;
          }
        }}
        muted={muted}
      ></video>
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
  );
}
