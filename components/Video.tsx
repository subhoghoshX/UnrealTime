interface Props {
  stream: MediaStream;
  name: string;
  id: string;
}

export default function Video({ stream, name, id }: Props) {
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
        muted
      ></video>
      <p className="absolute bottom-2 left-3 text-white">
        {name}: {id}
      </p>
    </div>
  );
}
