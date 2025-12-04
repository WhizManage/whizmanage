import React from "react";
import { RadioGroup, Radio, cn } from "@heroui/react";

export const CustomRadio = (props) => {
  const { children, ...otherProps } = props;

  return (
    <Radio
      {...otherProps}
      classNames={{
        base: cn(
            "inline-flex m-0 bg-content1 hover:bg-content2 items-center",
            "max-w-full cursor-pointer rounded-lg gap-4 px-4 border-2 border-transparent",
            "data-[selected=true]:border-fuchsia-600 dark:bg-slate-700 dark:hover:!bg-slate-800"
        ),
        control: "dark:bg-slate-300",
        wrapper:"dark:bg-slate-500"
      }}
    >
      {children}
    </Radio>
  );
};

