// src/components/ui/nextUI/Tooltip.jsx

import { Tooltip } from "@heroui/react";

export default function CustomTooltip({
  children,
  title,
  description,
  contentClassName,
  instantClose = false,
  portalContainer,
}) {
  const instantCloseProps = instantClose ? {
    delay: 0,
    closeDelay: 0,
    offset: 15,
    motionProps: {
      variants: {
        exit: { opacity: 0, transition: { duration: 0 } },
        enter: { opacity: 1, transition: { duration: 0.1 } },
      },
    },
  } : {};

  return (
    <Tooltip
      className={contentClassName}
      classNames={{
        content: "!border !border-input p-1 dark:!bg-slate-800 !z-[9999]",
      }}
      content={
        <div className={`p-1 dark:!bg-slate-800 ${instantClose ? 'pointer-events-none' : ''}`}>
          <div className="text-small text-center">{title}</div>
          {description && <div className="text-tiny">{description}</div>}
        </div>
      }
      portalContainer={portalContainer}
      {...instantCloseProps}
    >
      {children}
    </Tooltip>
  );
}