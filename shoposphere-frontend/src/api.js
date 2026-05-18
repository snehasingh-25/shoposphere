// API URL - uses environment variable in production, localhost in development
//export const API = import.meta.env.VITE_API_URL;
export const API = "http://localhost:3004";

export async function uploadCustomizationImages(productId, files) {
	const formData = new FormData();
	for (const file of files || []) {
		formData.append("customizationImages", file);
	}

	const res = await fetch(`${API}/customization/upload/${productId}`, {
		method: "POST",
		credentials: "include",
		body: formData,
	});
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data.error || "Failed to upload customization images");
	}
	return Array.isArray(data.imageUrls) ? data.imageUrls : [];
}