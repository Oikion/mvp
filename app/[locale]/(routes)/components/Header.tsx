import FulltextSearch from "./FulltextSearch";
import AvatarDropdown from "./ui/AvatarDropdown";

import { Separator } from "@/components/ui/separator";
import MobileSidebar from "./MobileSidebar";

type Props = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  lang: string;
};

const Header = ({ id, name, email, avatar, lang }: Props) => {
  return (
    <>
      <div className="flex h-16 items-center justify-between p-5">
        <div className="flex items-center gap-4">
          <MobileSidebar />
          <FulltextSearch />
        </div>

        <div className="flex items-center gap-3">
          <AvatarDropdown
            avatar={avatar}
            userId={id}
            name={name}
            email={email}
          />
        </div>
      </div>
      <Separator />
    </>
  );
};

export default Header;
