import axios from "axios";

const API_BASE_URL = `${import.meta.env.VITE_REACT_APP_BASE_URL}/customers`;

export const fetchUserProfile = async (username: string, token: string) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(`${API_BASE_URL}/profile/${username}`, config);
  return response.data.userDetails;
};

export const updateUserProfile = async ({
  username,
  profileData,
  token,
}: {
  username: string;
  profileData: any;
  token: string;
}) => {
  const response = await axios.post(`${API_BASE_URL}/profile/${username}`, profileData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

const API_PROVIDER_SEARCH_URL = `${import.meta.env.VITE_REACT_APP_BASE_URL}/search/`;

export const searchAirbusProviders = async (searchCriteria: any, token: string) => {
  try {
    const response = await axios.post(API_PROVIDER_SEARCH_URL, searchCriteria, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const onClickMore = async (initialSearchCriteria: any, page: number, token: string) => {
  const nextSearchCriteria = {
    ...initialSearchCriteria,
    startPage: page + 1,
  };

  try {
    const data = await searchAirbusProviders(nextSearchCriteria, token);
    if (!data.features || data.features.length === 0) {
      return { message: "No More Images!" };
    } else {
      return data;
    }
  } catch (err) {
    throw new Error("Error loading more data");
  }
};
