"use client";

import { useEffect } from "react";
import { useReactTable, type TableOptions } from "@tanstack/react-table";

const COOKIE_NAME = "oikion-page-size";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds
const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100, 250, 500] as const;

function getPageSizeFromCookie(): number {
  if (typeof document === "undefined") return DEFAULT_PAGE_SIZE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return DEFAULT_PAGE_SIZE;
  const value = Number(match[1]);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value) ? value : DEFAULT_PAGE_SIZE;
}

function setPageSizeCookie(size: number): void {
  document.cookie = `${COOKIE_NAME}=${size}; path=/; max-age=${COOKIE_MAX_AGE}`;
}

export function useTableWithPageSize<TData>(options: TableOptions<TData>) {
  const savedPageSize = getPageSizeFromCookie();

  const table = useReactTable({
    ...options,
    initialState: {
      ...options.initialState,
      pagination: {
        ...options.initialState?.pagination,
        pageSize: savedPageSize,
      },
    },
  });

  const currentPageSize = table.getState().pagination.pageSize;

  useEffect(() => {
    setPageSizeCookie(currentPageSize);
  }, [currentPageSize]);

  return table;
}
