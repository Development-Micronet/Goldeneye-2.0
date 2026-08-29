import React from "react";
import "./Header.css";
import Micronetlogo from "../../assets/Logos/MSOLU_10K.png";

const Header: React.FC = () => {
  return (
    <div className="header1">
      <div className="left-side">
        <h1 className="heading">Golden Eye</h1>
      </div>
      <div className="right-side">
        <img
          src={Micronetlogo}
          alt="Micronet Logo"
          className="logo"
          width="30"
          height="30"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default Header;
