"use client";

import Image from "next/image";
import { Users } from "@prisma/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import useAvatarStore from "@/store/useAvatarStore";
import axios from "axios";

interface ProfileFormProps {
  data: Users;
}

export function ProfilePhotoForm({ data }: ProfileFormProps) {
  const [avatar, setAvatar] = useState(data.avatar);
  const [avatarUrl, setAvatarUrl] = useState("");

  const { toast } = useToast();
  const router = useRouter();
  const setAvatarStore = useAvatarStore((state) => state.setAvatar);

  useEffect(() => {
    setAvatar(data.avatar);
  }, [data.avatar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatarUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid avatar URL",
        duration: 5000,
      });
      return;
    }

    try {
      setAvatar(avatarUrl);
      setAvatarStore(avatarUrl);
      await axios.put("/api/profile/updateProfilePhoto", { avatar: avatarUrl });
      toast({
        variant: "success",
        title: "Profile photo updated.",
        description: "Your profile photo has been updated.",
        duration: 5000,
      });
      setAvatarUrl("");
      router.refresh();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error updating profile photo.",
        description: "There was an error updating your profile photo.",
        duration: 5000,
      });
    }
  };

  return (
    <div className="flex flex-col items-center space-y-5">
      <div>
        <Image
          src={avatar || "/images/nouser.png"}
          alt="avatar"
          width={100}
          height={100}
          className="rounded-full"
        />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-2 w-full max-w-xs">
        <Label htmlFor="avatarUrl">Avatar URL</Label>
        <Input
          id="avatarUrl"
          type="url"
          placeholder="Enter image URL"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />
        <Button type="submit">Update Avatar</Button>
      </form>
    </div>
  );
}
