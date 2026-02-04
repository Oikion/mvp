// MobileSidebar is deprecated - the shadcn sidebar handles mobile responsiveness automatically
// This component is kept for backwards compatibility but is no longer used
// The SidebarTrigger in the layout handles mobile sidebar toggling

import { Menu } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

const MobileSidebar = () => {
  // Use the built-in SidebarTrigger which handles mobile automatically
  return (
    <div className="md:hidden">
      <SidebarTrigger className="hover:opacity-75 transition">
        <Menu className="h-5 w-5" />
      </SidebarTrigger>
    </div>
  );
};

export default MobileSidebar;
