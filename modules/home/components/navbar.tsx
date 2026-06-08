import { UserRole } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { SignInButton, SignUpButton, UserButton, Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export const Navbar = ({ userRole }: { userRole?: UserRole | undefined }) => {
  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-5xl px-4">
      <div className="bg-white/10 dark:bg-black/10 theme-green-black:bg-black/40 backdrop-blur-md border border-white/20 dark:border-white/10 theme-green-black:border-green-900/50 rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20 transition-all duration-200 hover:bg-white/15 dark:hover:bg-black/15">
        <div className="px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-[42px] h-[42px] overflow-hidden rounded-full">
           <Image
           src="https://res.cloudinary.com/drfwbriwh/image/upload/v1780564251/download_6_ky8d66.jpg"
           alt="GFGCodeBox"
           fill
           className="object-cover scale-150"
             />
             </div>
            <span className="text-2xl font-bold tracking-wide text-primary">
              GFGCodeBox
            </span>
          </Link>

          <div className="flex flex-row items-center justify-center gap-x-4">
            <Link
              href="/problems"
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 theme-green-black:text-green-200/80 hover:text-primary cursor-pointer"
            >
              Problems
            </Link>
            <Link
              href="/contests"
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 theme-green-black:text-green-200/80 hover:text-primary cursor-pointer"
            >
              Contests
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 theme-green-black:text-green-200/80 hover:text-primary cursor-pointer"
            >
              About
            </Link>
            <Link
              href="/profile"
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 theme-green-black:text-green-200/80 hover:text-primary cursor-pointer"
            >
              Profile
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <Show when={"signed-in"}>
              {userRole && userRole === UserRole.ADMIN && (
                <>
                  <Link href={"/create-problem"}>
                    <Button variant={"outline"} size={"default"}>
                      Create Problem
                    </Button>
                  </Link>
                  <Link href={"/contests/create"}>
                    <Button variant={"outline"} size={"default"}>
                      Create Contest
                    </Button>
                  </Link>
                </>
              )}
              <UserButton />
            </Show>

            <Show when={"signed-out"}>
              <SignInButton />
              <SignUpButton>
                <Button
                  size="sm"
                  className="text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Sign Up
                </Button>
              </SignUpButton>
            </Show>
          </div>
        </div>
      </div>
    </nav>
  );
};
