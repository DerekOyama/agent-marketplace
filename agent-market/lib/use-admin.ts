"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export function useAdmin() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") {
      setIsLoading(true);
      return;
    }

    if (status === "unauthenticated") {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    if (session?.user?.email === "derek.oyama@gmail.com") {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
    
    setIsLoading(false);
  }, [session, status]);

  return { isAdmin, isLoading };
}
