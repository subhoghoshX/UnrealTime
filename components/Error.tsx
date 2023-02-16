import { useEffect } from "react";

interface Props {
  errorMessage: string;
  onTimeOut: () => void;
}

export default function Error({ errorMessage, onTimeOut }: Props) {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onTimeOut();
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="border-l-4 border-red-500 bg-red-50 px-4 py-2">
      <h2 className="font-bold text-red-700">Error</h2>
      <p className="italic">{errorMessage}</p>
    </div>
  );
}
