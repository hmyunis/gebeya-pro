import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  addToast,
} from "@heroui/react";
import {
  CheckCircle,
  Copy,
  EnvelopeSimple,
  Key,
  ShareNetwork,
  TelegramLogo,
  UserCircle,
  WhatsappLogo,
} from "@phosphor-icons/react";
import type { CreatedCustomerCredentials } from "../../types";

interface CustomerCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: CreatedCustomerCredentials | null;
  customerName?: string | null;
}

function getShareMessage(customerName: string | null | undefined, credentials: CreatedCustomerCredentials) {
  const safeName = customerName?.trim();
  const greeting = safeName ? `Account for ${safeName}` : "Your account details";
  return `${greeting}\nUsername: ${credentials.username}\nPassword: ${credentials.password}`;
}

function openDeepLinkWithFallback(appUrl: string, webUrl: string) {
  let appOpened = false;
  const onVisibilityChange = () => {
    if (document.hidden) {
      appOpened = true;
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = appUrl;
  document.body.appendChild(iframe);

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }

    if (!appOpened) {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
  }, 1100);
}

async function copyText(value: string, successMessage: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    addToast({
      title: "Copied",
      description: successMessage,
      color: "success",
    });
  } catch {
    addToast({
      title: "Copy failed",
      description: "Could not copy text. Please copy it manually.",
      color: "danger",
    });
  }
}

export default function CustomerCredentialsModal({
  isOpen,
  onClose,
  credentials,
  customerName,
}: CustomerCredentialsModalProps) {
  const canShareNatively =
    typeof navigator !== "undefined" && typeof navigator.share === "function";
  const shareMessage = credentials ? getShareMessage(customerName, credentials) : "";

  const openShareLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareViaTelegram = () => {
    const telegramWebUrl = `https://t.me/share/url?text=${encodeURIComponent(shareMessage)}`;
    const telegramAppUrl = `tg://msg?text=${encodeURIComponent(shareMessage)}`;
    openDeepLinkWithFallback(telegramAppUrl, telegramWebUrl);
  };

  const shareViaWhatsApp = () => {
    const whatsappWebUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    const whatsappAppUrl = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
    openDeepLinkWithFallback(whatsappAppUrl, whatsappWebUrl);
  };

  const shareViaNative = async () => {
    if (!credentials) return;
    if (!canShareNatively) {
      addToast({
        title: "Native share unavailable",
        description: "Use Telegram, WhatsApp, or email instead.",
        color: "warning",
      });
      return;
    }

    try {
      await navigator.share({
        title: "Gebeya Pro login credentials",
        text: shareMessage,
      });
    } catch {
      // Ignore cancelled native share.
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          <span>Customer Credentials</span>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {credentials ? (
            <>
              <p className="text-sm text-default-500">
                Share these password login credentials with the customer.
              </p>
              <Input
                label="Username"
                isReadOnly
                value={credentials.username}
                startContent={<UserCircle className="h-4 w-4 text-default-400" />}
                endContent={
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => copyText(credentials.username, "Username copied to clipboard.")}
                    startContent={<Copy className="h-3.5 w-3.5" />}
                  >
                    Copy
                  </Button>
                }
              />
              <Input
                label="Password"
                isReadOnly
                value={credentials.password}
                startContent={<Key className="h-4 w-4 text-default-400" />}
                endContent={
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => copyText(credentials.password, "Password copied to clipboard.")}
                    startContent={<Copy className="h-3.5 w-3.5" />}
                  >
                    Copy
                  </Button>
                }
              />

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="flat"
                  onPress={() => copyText(shareMessage, "Credentials copied to clipboard.")}
                  startContent={<Copy className="h-4 w-4" />}
                >
                  Copy All
                </Button>
                <Button
                  color="primary"
                  variant="flat"
                  onPress={shareViaNative}
                  startContent={<ShareNetwork className="h-4 w-4" />}
                >
                  Share
                </Button>
                <Button
                  variant="flat"
                  onPress={shareViaTelegram}
                  startContent={<TelegramLogo className="h-4 w-4" />}
                >
                  Telegram
                </Button>
                <Button
                  variant="flat"
                  onPress={shareViaWhatsApp}
                  startContent={<WhatsappLogo className="h-4 w-4" />}
                >
                  WhatsApp
                </Button>
                <Button
                  variant="flat"
                  className="sm:col-span-2"
                  onPress={() =>
                    openShareLink(
                      `mailto:?subject=${encodeURIComponent(
                        "Gebeya Pro Login Credentials",
                      )}&body=${encodeURIComponent(shareMessage)}`,
                    )
                  }
                  startContent={<EnvelopeSimple className="h-4 w-4" />}
                >
                  Email
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-default-500">No credentials available.</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onPress={onClose} color="primary">
            Done
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
