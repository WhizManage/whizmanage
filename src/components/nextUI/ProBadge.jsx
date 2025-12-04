import React from "react";
import { Chip } from "@heroui/react";

export default function ProBadge() {
  return (
    <Chip
      variant="shadow"
      classNames={{
        base: "bg-gradient-to-br h-4 w-8 !py-1 !px-1.5 from-indigo-500 to-pink-500 border-0 shadow-pink-500/30",
        content: "drop-shadow shadow-black text-white !m-0 !p-0 !text-xs",
      }}
    >
      Pro
    </Chip>
  );
}
