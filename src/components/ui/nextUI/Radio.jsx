// src/components/ui/nextUI/CustomRadio.jsx

import { Radio, cn } from "@heroui/react";

export const CustomRadio = (props) => {
  const { children, ...otherProps } = props;

  return (
    <Radio
      {...otherProps}
      classNames={{
        base: cn(
          "inline-flex m-0 bg-content1 hover:bg-content2 items-center",
          "max-w-full cursor-pointer rounded-lg gap-4 px-4 border-2 border-transparent",
          "data-[selected=true]:border-fuchsia-600 dark:bg-slate-700 dark:hover:!bg-slate-800",
          "!outline-none [&:focus-visible]:!ring-0 [&:focus]:!ring-0"
        ),
        control: "dark:bg-slate-300 !outline-none !ring-0",
        wrapper: "dark:bg-slate-500 !outline-none !ring-0",
      }}
    >
      {children}
    </Radio>
  );
};
