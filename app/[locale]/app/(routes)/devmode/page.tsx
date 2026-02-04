/*
  This route is used to test the different components of the app.
*/

"use client";

import { MultiSelect } from "@/components/ui/multi-select";
import React, { useState } from "react";

const DevModePage = () => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const options = [
    { value: "option-1", label: "Option 1" },
    { value: "option-2", label: "Option 2" },
    { value: "option-3", label: "Option 3" },
    { value: "option-4", label: "Option 4" },
  ];

  return (
    <div className="space-y-5 p-5">
      <h1 className="text-2xl font-bold">Dev Mode - Component Testing</h1>
      <div>
        <h2 className="text-lg font-semibold mb-2">MultiSelect Component</h2>
        <MultiSelect
          options={options}
          value={selectedValues}
          onChange={setSelectedValues}
        />
      </div>
    </div>
  );
};

export default DevModePage;
