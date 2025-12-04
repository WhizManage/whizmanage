
import {
  Dropdown,
  DropdownItem,
  DropdownSection,
  DropdownTrigger,
  Button as UiButton,
  DropdownMenu as UiDropdownMenu,
} from "@heroui/react";
import {
  Upload,
} from "lucide-react";
import { useProductsContext } from "@/context/ProductsContext";
import { __ } from '@wordpress/i18n';
import ProBadge from "../../../../../components/nextUI/ProBadge";
const Import = () => {
   
  useProductsContext();
  return (
    <>
      <>
        <Dropdown
          classNames={{
            content: "p-0",
          }}
        >
          <DropdownTrigger className="h-10">
            <UiButton
              variant="outline"
              className="h-10 bg-background hover:bg-neutral-100 hover:text-accent-foreground dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-md text-sm"
            >
              <Upload className="h-4 w-4" />
              {__("Import", "whizmanage")}
            </UiButton>
          </DropdownTrigger>
          <UiDropdownMenu
            aria-label="Import Options"
            className="bg-background hover:bg-background px-2 dark:bg-slate-700 dark:hover:bg-slate-700 dark:text-slate-300 dark:hove:text-slate-300 rounded-md text-sm m-0"
          >
            <DropdownSection title={__("File type", "whizmanage")}>
              <DropdownItem
                key="google"
                className="bg-background hover:bg-neutral-100 hover:text-accent-foreground dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-md text-sm"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={
                      window.siteUrl +
                      "/wp-content/plugins/whizmanage/assets/images/icons/google-sheets.png"
                    }
                    alt="sheets Logo"
                    className="w-5 h-5"
                  />
                  {__("Google sheets file", "whizmanage")}
                  <ProBadge/>

                </div>
              </DropdownItem>
            </DropdownSection>
          </UiDropdownMenu>
        </Dropdown>
      </>
    </>
  );
};

export default Import;
