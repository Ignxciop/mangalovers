import React from "react";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

interface MangaPaginationProps {
    page: number;
    totalPages: number;
    setPage: (page: number) => void;
}

export const MangaPagination: React.FC<MangaPaginationProps> = React.memo(
    ({ page, totalPages, setPage }) => {
        const handlePrev = () => {
            if (page > 1) setPage(page - 1);
        };

        const handleNext = () => {
            if (page < totalPages) setPage(page + 1);
        };

        const pageNumbers: number[] = [1];
        let start = Math.max(page - 3, 2);
        let end = Math.min(page + 3, totalPages - 1);

        if (page <= 4) {
            start = 2;
            end = Math.min(7, totalPages - 1);
        }

        if (page >= totalPages - 3) {
            start = Math.max(totalPages - 6, 2);
            end = totalPages - 1;
        }

        for (let i = start; i <= end; i++) pageNumbers.push(i);
        if (totalPages > 1) pageNumbers.push(totalPages);

        const uniquePages = [...new Set(pageNumbers)];

        return (
            <Pagination>
                <PaginationContent className="flex flex-wrap justify-center gap-1 max-w-full overflow-hidden">
                    <PaginationItem className="hidden sm:block">
                        <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                handlePrev();
                            }}
                            aria-disabled={page === 1}
                            className="px-3"
                        />
                    </PaginationItem>

                    {uniquePages.map((p, idx) => (
                        <React.Fragment key={p}>
                            {idx > 0 &&
                                uniquePages[idx] - uniquePages[idx - 1] > 1 && (
                                    <PaginationItem>
                                        <span className="px-2 text-muted-foreground">
                                            ...
                                        </span>
                                    </PaginationItem>
                                )}

                            <PaginationItem>
                                <PaginationLink
                                    href="#"
                                    isActive={p === page}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setPage(p);
                                    }}
                                    className="px-2 sm:px-3"
                                >
                                    {p}
                                </PaginationLink>
                            </PaginationItem>
                        </React.Fragment>
                    ))}

                    <PaginationItem className="hidden sm:block">
                        <PaginationNext
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                handleNext();
                            }}
                            aria-disabled={page === totalPages}
                            className="px-3"
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        );
    },
);
