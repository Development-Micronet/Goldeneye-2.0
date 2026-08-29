import React from "react";
import "./Footer.css";
import { DoubleRightOutlined } from "@ant-design/icons";

const Footer: React.FC = () => {
  return (
    <div className="container-fluid footerMainBox">
      <div className="bg-gray-100">
        <div className="Footerbackground mx-auto grid w-full gap-4 text-gray-800 sm:grid-cols-1 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:d-flex lg:justify-content-end lg:align-items-center ImageContaineroflogo mt-2 w-full">
            <div className="lg:text-align-center text-xl font-bold text-indigo-600">GoldenEye</div>
          </div>
          <div className="ServiceContainerMAin w-full">
            <div className="mt-2 text-sm font-bold text-indigo-600 uppercase">Services</div>
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
          <div className="ServiceContainer w-full">
            <div className="mt-2 text-sm font-bold text-indigo-600 uppercase">GoldenEye</div>
            <p className="my-3">
              Welcome to Golden Eye, your premier source for high-resolution satellite imagery. Our
              platform allows you to search, view, and order top-quality AIRBUS images for various
              needs.
            </p>
          </div>
          <div className="ServiceContainer mt-2 w-1/2 md:w-full">
            <div className="text-sm font-bold text-indigo-600 uppercase">Contact us</div>
            <p className="my-3 block">Plot No. 80 K T Nagar, Katol Road, Nagpur - 440013</p>
            <p>info@goldeneye.com</p>
            <p>123-456-7890</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
