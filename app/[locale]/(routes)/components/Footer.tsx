import getNextVersion from "@/actions/system/get-next-version";
import { Link } from "@/navigation";
import React from "react";

const Footer = async () => {
  const nextVersion = await getNextVersion();
  
  // Format version properly - replace spaces with dots if needed
  const formatVersion = (version: string | undefined) => {
    if (!version) return "0.0.1-alpha";
    // Replace spaces with dots in version format
    return version.replace(/\s+/g, ".").replace(/\.+/g, ".");
  };
  
  const appVersion = formatVersion(process.env.NEXT_PUBLIC_APP_V || "0.0.1-alpha");
  
  return (
    <footer className="flex flex-row h-8 shrink-0 justify-end items-center w-full text-xs text-muted-foreground p-5">
      <div className="hidden md:flex items-center space-x-2">
        <Link href="/">
          <span className="text-xs text-muted-foreground">
            {process.env.NEXT_PUBLIC_APP_NAME || "Oikion"} – {appVersion}
          </span>
        </Link>
        <span>powered by Next.js</span>
        <span className="bg-black rounded-md text-white px-1 mx-1">
          {nextVersion.substring(1, 7) || process.env.NEXT_PUBLIC_NEXT_VERSION}
        </span>
      </div>
    </footer>
  );
};

export default Footer;
