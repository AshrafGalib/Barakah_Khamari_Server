const API_BASE_URL = "http://localhost:5000/api";

const request = async (url, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "সার্ভারে সমস্যা হয়েছে"
    );
  }

  return data;
};

export const categoryAPI = {
  getAll: () => {
    return request("/categories");
  },

  getById: (id) => {
    return request(`/categories/${id}`);
  },

  create: (category) => {
    return request("/categories", {
      method: "POST",
      body: JSON.stringify(category),
    });
  },

  update: (id, category) => {
    return request(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(category),
    });
  },

  delete: (id) => {
    return request(`/categories/${id}`, {
      method: "DELETE",
    });
  },
};