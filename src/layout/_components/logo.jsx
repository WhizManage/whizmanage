import { Link } from "react-router-dom";

export const Logo = () => {
  return (
    <a
      dir="ltr"
      href="/wordpress/wp-admin/admin.php?page=whizmanage"
      className="font-normal flex gap-0.5 items-center text-sm mr-4  text-black md:px-2  relative z-20 cursor-pointer"

    >
      <img
        src={
          window.siteUrl +
          "/wp-content/plugins/whizmanage/assets/images/logo/symbol.svg"
        }
        alt=""
        className="size-12"
      />
      <div className="notranslate">
        <span className="dark:text-white text-3xl">hiz</span>
        <span className="dark:text-white font-bold text-3xl">
          <span>man</span>
          <span>age</span>
        </span>
      </div>
    </a>
  );
};
