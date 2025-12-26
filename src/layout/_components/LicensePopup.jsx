import { Input } from "@components/ui/input";
import {
  Button,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";
 import { __ } from "@wordpress/i18n";
import { getApi, getApiLice, postApi, putApi } from "/src/services/services";
import { AlertCircle, Undo2, Sparkles } from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import axios from "axios";

const LicensePopup = () => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [licenseKey, setLicenseKey] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(false);
   
  useEffect(() => {
    // getTrialToken()
    getLicense();
    // onOpen();
  }, []);

  const getTrialToken = async () => {
    try {
      const response = await axios.get(
        window.siteUrl + "/wp-json/wm/v1/token",
        {
          headers: {
            "X-WP-Nonce": window.rest, // חובה עם WP Nonce
          },
        }
      );

      checkTrialToken(response.data);
      // return response.data.token;
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);
    }
  };

  const checkTrialToken = async (data) => {
    try {
      const response = await axios.post(
        "http://localhost/wordpress/wp-json/trial/v1/validate-token",
        {
          token: data.token,
          email: data.email,
          site_url: window.siteUrl,
        }
      );

      // setResponseMessage(`Success: ${response.data.message}`);
    } catch (error) {
      if (error.response) {
        onOpen();
        // אם התקבלה שגיאה מהשרת
        // setResponseMessage(`Error: ${error.response.data.message}`);
      } else {
        // שגיאת רשת או שגיאה כללית
        // setResponseMessage("An error occurred while verifying the token.");
      }
      console.error("Verification error:", error);
    } finally {
    }
  };

  const getLicense = async () => {
    const urlOpt = window.siteUrl + "/wp-json/whizmanage/v1/wlic";
    const responseOpt = await getApi(urlOpt);
    checkLicense(responseOpt.data.key, responseOpt.data.token);
  };

  const checkLicense = async (license, token) => {
    if (!license || license?.length < 20) {
      onOpen();
      window.whizmanagePro = true;
      return;
    }
    // const url = `https://whizmanage.com/wp-json/lmfwc/v2/licenses/${license}`;
    const url = `https://whizmanage.com/wp-json/whizmanage/v1/license/verify/${license}`;

    const res = await getApiLice(url, onOpen);
    if (res.data.data.status === 404) {
      setErrorMsg(__("The license was not found.", "whizmanage"));
      onOpen();
      window.whizmanagePro = true;
      return;
    }
    window.licenseWhizmanage = res.data.data.expiresAt;
    if (res.data.data.errors) {
      setErrorMsg("The license was not found.");
      onOpen();
      window.whizmanagePro = true;
    }
    const dateString = res.data.data.expiresAt;
    if (dateString) {
      const dateObject = new Date(dateString);
      const unixTimeInSeconds = Math.floor(dateObject.getTime() / 1000);
      const currentDate = new Date();
      const currentDateUnixTimeInSeconds = Math.floor(
        currentDate.getTime() / 1000
      );
      if (currentDateUnixTimeInSeconds > unixTimeInSeconds) {
        onOpen();
        window.whizmanagePro = true;
        setErrorMsg(__("The license has expired", "whizmanage"));
      }
    }

    if (window.siteUrl == "https://organzaplus.co.il") {
      return;
    }

    const tokenExists = res.data.data.activationData.some(
      (item) => item.token === token
    );
    if (!tokenExists) {
      setErrorMsg(__("The license was not found.", "whizmanage"));
      onOpen();
      window.whizmanagePro = true;
    }
    const tokenActivate = res.data.data.activationData.find(
      (item) => item.token === token
    );
    if (tokenActivate && tokenActivate.deactivated_at) {
      onOpen();
    }

    if (tokenActivate?.deactivated_at) {
      setErrorMsg(
        __(
          "Your license was deactivated on {{date}}. If you wish to continue using this site, please reactivate your license.",
          {
            date: tokenActivate.deactivated_at,
          }
        )
      );
    }
  };

  const saveLicenseInDb = async (license, token) => {
    const newPro = { name: "pro", reservedData: license };
    const urlWhiz = window.siteUrl + "/wp-json/whizmanage/v1/columns/pro";
    await putApi(urlWhiz, newPro);
    const urlOpt = window.siteUrl + "/wp-json/whizmanage/v1/wlic";
    await postApi(urlOpt, { key: license, token: token });
  };

  const activateLicense = async () => {
    setLoading(true);
    // const url = `https://whizmanage.com/wp-json/lmfwc/v2/licenses/activate/${licenseKey}`;
    const url = `https://whizmanage.com/wp-json/whizmanage/v1/license/activate/${licenseKey}`;

    try {
      const data = await getApiLice(url);
      if (data.data.data.activationData) {
        window.whizmanagePro = false;
        await saveLicenseInDb(licenseKey, data.data.data.activationData.token);
        if (
          typeof window.licenseToken !== "object" ||
          window.licenseToken === null
        ) {
          window.licenseToken = {}; // אתחול כאובייקט ריק אם הוא לא קיים
        }
        window.licenseToken.token = data.data.data.activationData.token;
        setShowConfetti(true);
        onClose();
      } else {
        setErrorMsg(data.data.data.errors.lmfwc_rest_data_error[0]);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(__("Failed to activate the license. Please try again.", "whizmanage"));
    }
    setLoading(false);
  };



  return (
    <div>
      {showConfetti && (
        <ReactConfetti
          className="pointer-events-none z-[1000]"
          numberOfPieces={500}
          recycle={false}
          onConfettiComplete={() => setShowConfetti(false)}
        />
      )}
      <Modal
        size="4xl"
        scrollBehavior="inside"
        hideCloseButton
        isDismissable={false}
        isKeyboardDismissDisabled
        backdrop="opaque"
        className="!scrollbar-hide scrollbar-none"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: {
                duration: 0.3,
                ease: "easeOut",
              },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: "easeIn",
              },
            },
          },
        }}
      >
        <ModalContent className="dark:bg-slate-900">
          <ModalHeader className="flex gap-3 justify-center items-center">
            <IconBadge icon={Sparkles} variant="default" size="default" />
            <h2 className="text-3xl font-semibold text-fuchsia-600">
              {__("Welcome to WhizManage!", "whizmanage")}
            </h2>
          </ModalHeader>
          <ModalBody className="flex flex-col items-center justify-center gap-6 pb-4">
            <h3 className="text-2xl text-slate-500 text-center">
              {__(
                "Thank you for choosing the #1 product for managing your WooCommerce store! We are excited to help you manage your store with ease and efficiency.",
                "whizmanage"
              )}
            </h3>
            <h4 className="text-base text-slate-400 font-light">
              {__(
                " Please enter the license key you received after purchase. You can always find it in your",
                "whizmanage"
              )}{" "}
              <Link
                href="https://whizmanage.com/my-account/view-license-keys/"
                isExternal
                showAnchorIcon
              >
                {__("personal area here", "whizmanage")}
              </Link>
              .
            </h4>
            <Input
              type="text"
              placeholder={__("Enter your license key", "whizmanage")}
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="text-center w-96 focus:!border-fuchsia-600 focus:!ring-fuchsia-600 dark:!text-slate-300"
            />
            <Button
              onClick={activateLicense}
              color="primary"
              isLoading={loading}
              radius="full"
            >
              {__("Activate License", "whizmanage")}
            </Button>
            <div className="min-h-8">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-red-500 flex gap-2 items-center"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </div>
            {/* <Input
              type="text"
              placeholder={__("Enter your email")}
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="text-center w-96 focus:!border-fuchsia-600 focus:!ring-fuchsia-600 dark:!text-slate-300"
            />
            <Button
              onClick={activateTrial}
              color="primary"
              isLoading={loading}
              radius="full"
            >
              {__("Trial License")}
            </Button> */}

            <Link href={window.siteUrl + "/wp-admin"}>
              <Button
                variant="outline"
                className="gap-4 text-slate-600 dark:text-slate-300 dark:bg-slate-700"
              >
                <Undo2 className="text-fuchsia-600 w-4 h-4" />
                <span>{__("Back to wordpress", "whizmanage")}</span>
              </Button>
            </Link>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default LicensePopup;
