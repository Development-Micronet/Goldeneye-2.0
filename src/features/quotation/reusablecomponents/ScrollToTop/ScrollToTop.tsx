import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop(): null {
  const { pathname } = useLocation();

  useEffect(() => {
    const scrollContainer = document.getElementById("MainContentBody");
    if (scrollContainer) {
      scrollContainer.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
