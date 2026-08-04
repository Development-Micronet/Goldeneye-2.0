import React from "react";
import { useSearchParams } from "react-router-dom";
import Quotationlayout from "../components/Quotationlayout";
import CreateQuotation from "../components/CreateQuotation";
import UpdateQuotation from "../components/UpdateQuotation";

export const QuotationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view");

  if (view === "create") {
    return <CreateQuotation />;
  }

  if (view === "update") {
    return <UpdateQuotation />;
  }

  return <Quotationlayout />;
};
