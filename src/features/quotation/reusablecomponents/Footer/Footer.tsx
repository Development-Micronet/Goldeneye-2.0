import React from "react";
import "./Footer.css";
import { DoubleRightOutlined } from "@ant-design/icons";

const Footer: React.FC = () => {
  return (
    <div className="container-fluid footerMainBox">
      <div className="bg-gray-100">
        <div className="w-full sm:px-6 text-gray-800 grid gap-4 mx-auto Footerbackground lg:grid-cols-4 md:grid-cols-2 sm:grid-cols-1">
          <div className="w-full lg:d-flex lg:justify-content-end lg:align-items-center mt-2 ImageContaineroflogo">
            <div className="font-bold text-xl text-indigo-600 lg:text-align-center">
              GoldenEye
            </div>
          </div>
          <div className="w-full ServiceContainerMAin">
            <div className="text-sm uppercase text-indigo-600 font-bold mt-2">
              Services
            </div>
            <p className="my-3 block">
              <DoubleRightOutlined /> Satellite Imagery Search
            </p>
            <p className="my-3 block">
              <DoubleRightOutlined /> Imagery Viewing
            </p>
            <p className="my-3 block">
              <DoubleRightOutlined /> Imagery Tasking Orders
            </p>
            <p className="my-3 block">
              <DoubleRightOutlined /> Data Download and Delivery
            </p>
            <p className="my-3 block">
              <DoubleRightOutlined /> Subscription Services
            </p>
            <p className="my-3 block">
              <DoubleRightOutlined /> Technical Support and Consulting
            </p>
          </div>
          <div className="w-full ServiceContainer">
            <div className="text-sm uppercase text-indigo-600 font-bold mt-2">
              GoldenEye
            </div>
            <p className="my-3">
              Welcome to Golden Eye, your premier source for high-resolution satellite imagery. Our platform allows you to search, view, and order top-quality AIRBUS images for various needs.
            </p>
          </div>
          <div className="mt-2 ServiceContainer w-1/2 md:w-full">
            <div className="text-sm uppercase text-indigo-600 font-bold">
              Contact us
            </div>
            <p className="my-3 block">
              Plot No. 80 K T Nagar, Katol Road, Nagpur - 440013
            </p>
            <p>info@goldeneye.com</p>
            <p>123-456-7890</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
