import { Card, Skeleton } from "@heroui/react";

export function AuthSkeleton() {
  return (
    <Card className="w-full max-w-sm overflow-hidden border-none shadow-2xl md:max-w-4xl">
      <div className="flex flex-col md:flex-row">
        <div className="flex w-full flex-col justify-between bg-white p-8 md:w-5/12 md:bg-gray-50">
          <Skeleton className="h-8 w-20 rounded-full" />
          <div className="mt-8 space-y-3">
            <Skeleton className="mx-auto h-12 w-12 rounded-2xl md:mx-0" />
            <Skeleton className="mx-auto h-8 w-32 rounded md:mx-0" />
            <Skeleton className="mx-auto h-4 w-48 rounded md:mx-0" />
          </div>
          <div className="mt-8 hidden md:block">
            <Skeleton className="h-4 w-full rounded" />
          </div>
        </div>

        <div className="w-full bg-white p-6 md:w-7/12 md:p-10">
          <div className="space-y-6">
            <Skeleton className="h-10 w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    </Card>
  );
}

