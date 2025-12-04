import { Skeleton } from "@components/ui/skeleton";
import { motion } from "framer-motion";

const SkeletonTable = () => {
  const dummy = Array.from({ length: 20 });
  return (
    <>
      {dummy.map((_, j) => (
        <tr key={j} className="h-16">
          <td className="p-4">
            <Skeleton className="h-4 w-4 rounded" />
          </td>
          {dummy.map((_, i) => (
            <td className="p-4" key={i}>
              <Skeleton className="h-4 w-full rounded-xl" />
            </td>
          ))}
        </tr>
      ))}
      <div className="bg-black/30 fixed inset-0 flex justify-center z-50 items-center">
        <motion.div
          className="h-20 w-20 flex justify-center items-center"
          animate={{
            scale: [1, 2, 2, 1, 1],
            rotate: [0, 0, 180, 180, 0],
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            times: [0, 0.2, 0.5, 0.8, 1],
            repeat: Infinity,
            repeatDelay: 1,
          }}
        >
          <img
            src={
              window.siteUrl +
              "/wp-content/plugins/whizmanage/assets/images/logo/symbol.svg"
            }
            alt="logo"
          />
        </motion.div>
      </div>
    </>
  );
};

export default SkeletonTable;
