import { useEffect, useState } from "react";

interface Props {
  stream: MediaStream;
}

export default function Wave({ stream }: Props) {
  const [freqData, setFreqData] = useState<number[]>([]);

  useEffect(() => {
    let setIntervalId: NodeJS.Timer;

    if (stream) {
      stream.onaddtrack = () => {
        if (stream.getAudioTracks().length !== 0) {
          clearInterval(setIntervalId);

          const audioCtx = new AudioContext();
          const analyzer = audioCtx.createAnalyser();

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyzer);

          analyzer.fftSize = 32;
          const bufferLength = analyzer.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          console.log("onaddtrack event fired");

          setIntervalId = setInterval(() => {
            analyzer.getByteFrequencyData(dataArray);
            const arr = Array.from(dataArray);
            setFreqData(arr);
          });
        }
      };
    }

    return () => {
      clearInterval(setIntervalId);
    };
  }, [stream]);

  return (
    <div className="flex h-4 items-center gap-px">
      {freqData.slice(0, 3).map((data, i) => (
        <div
          className="w-1 rounded-full bg-blue-500"
          style={{ height: data / 16 > 9 ? data / 16 : 4 }}
          key={i}
        ></div>
      ))}
    </div>
  );
}
