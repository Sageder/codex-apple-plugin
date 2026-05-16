export declare function jsonResponse(data: unknown): {
    content: {
        type: "text";
        text: string;
    }[];
};
export declare function errorResponse(error: unknown): {
    isError: boolean;
    content: {
        type: "text";
        text: string;
    }[];
};
