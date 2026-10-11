"use client";

import { createContext } from "react";

/** True while the kiosk's welcome screen waits for someone: the configurator runs its showroom loop. */
export const AttractContext = createContext(false);
