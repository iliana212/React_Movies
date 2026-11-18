const API_URL = import.meta.env.VITE_API_URL_IMAGES;

export const getImageUrl = (imagePath?: string): string => {
    if (!imagePath) {
        return "";
    }

    if (imagePath.startsWith("http")) {
        return imagePath;
    }

    return `${API_URL}${imagePath}`;
};