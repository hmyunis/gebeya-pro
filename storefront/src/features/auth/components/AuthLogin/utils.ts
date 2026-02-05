export function parseReturnTo(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("returnTo") ||
      sessionStorage.getItem("postLoginRedirect") ||
      "/"
    );
  } catch {
    return "/";
  }
}

export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    const message = (data as any)?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string" && message.trim()) return message;
  } catch {
    // ignore
  }
  return response.statusText || "Request failed";
}

export function isTelegramBotConfigured(botName: string): boolean {
  return Boolean(botName && botName !== "YOUR_BOT_NAME");
}
