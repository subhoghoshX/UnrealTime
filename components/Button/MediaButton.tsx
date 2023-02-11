import clsx from "clsx";
import type { IconType } from "react-icons";

interface CommonProps {
  onClick: () => void;
  className?: string;
}

interface PrimaryProps extends CommonProps {
  enabled: boolean;
  EnabledIcon: IconType;
  DisabledIcon: IconType;
  type: "primary";
}

interface SecondaryProps extends CommonProps {
  Icon: IconType;
  type: "secondary";
}

type Props = PrimaryProps | SecondaryProps;

export default function MediaButton(props: Props) {
  if (props.type === "primary") {
    const { onClick, enabled, EnabledIcon, DisabledIcon } = props;

    return (
      <button
        className={clsx(
          "rounded-full p-3.5 text-white",
          { "bg-red-500 hover:bg-red-400": !enabled },
          { "bg-zinc-700 hover:bg-zinc-600": enabled },
        )}
        onClick={onClick}
      >
        <DisabledIcon className={clsx("h-5 w-5", { hidden: enabled })} />
        <EnabledIcon className={clsx("h-5 w-5", { hidden: !enabled })} />
      </button>
    );
  } else {
    const { onClick, Icon, className } = props;

    return (
      <button
        className={`rounded-full bg-zinc-700 p-3.5 text-white hover:bg-zinc-600 ${className}`}
        onClick={onClick}
      >
        <Icon className="h-5 w-5" />
      </button>
    );
  }
}
