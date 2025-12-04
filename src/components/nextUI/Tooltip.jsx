import { Tooltip } from "@heroui/react";

export default function CustomTooltip({
  children,
  title,
  description,
  contentClassName,
}) {
  return (
    <Tooltip
      className={contentClassName}
      classNames={{
        content: "border-0 p-1",
      }}
      content={
        <div className={"p-1"}>
          <div className="text-small text-center">{title}</div>
          {description && <div className="text-tiny">{description}</div>}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}