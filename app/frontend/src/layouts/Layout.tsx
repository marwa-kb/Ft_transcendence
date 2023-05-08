import React from "react";
import { Outlet } from "react-router-dom";

import Header from '../components/Header/Header';
import InvitePopup from "../components/Chat/Invite/InvitePopup";


export default function Layout()
{
	return (
		<>
			<Header />
			<Outlet />
      		<InvitePopup />
		</>
	);
}