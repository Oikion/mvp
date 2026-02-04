import { Link } from "@/navigation";
import React from "react";
import { APP_VERSION, formatVersion } from "@/lib/version";
import { Badge } from "@/components/ui/badge";

const Footer = async () => {
  const appVersion = formatVersion(APP_VERSION);
  
  return (
    <footer className="flex flex-row h-8 shrink-0 justify-end items-center w-full text-xs text-muted-foreground p-5">
      <div className="hidden md:flex items-center space-x-2">
        <Link href="/">
          <span className="text-xs text-muted-foreground">
            {process.env.NEXT_PUBLIC_APP_NAME || "Oikion"}
          </span>
        </Link>
        <Badge variant="secondary" className="text-xs">
          {appVersion}
        </Badge>
      </div>
    </footer>
  );
};

export default Footer;
