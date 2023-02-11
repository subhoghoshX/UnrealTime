interface Props {
  stream: MediaStream;
  name: string;
  id: string;
  muted?: boolean;
}

export default function Video({ stream, name, id, muted }: Props) {
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
    </div>
  );
}
