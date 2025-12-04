import { ProductStatusKeys } from '@/data/statusKeys'
import { cn } from '@/lib/utils'
import React, { useState } from 'react'
import { __ } from '@wordpress/i18n';

const StatusVariationEdit = ({row, updateValue}) => {
    const [status, setStatus] = useState(row?.original?.status || "publish")
     
  return (
    <div className=" !rounded-md overflow-hidden !border-0 p-0 !border-slate-50">
    <select
      name=""
      id=""
      className={cn(
        "capitalize font-semibold px-2 m-0 text-sm w-fit rtl:mr-2 py-0 focus-visible:ring-0 focus:ring-offset-0 !rounded-md",
        updateValue ? "h-10" : "h-6",
        ProductStatusKeys[status]
      )}
      onChange={(e)=> {
        setStatus(e.target.value)
        updateValue && updateValue("status", e.target.value)
    }}
    >
      {Object.keys(ProductStatusKeys).slice(0, -1).map((statusItem) => (
        <option
          value={statusItem}
          className={cn(
            "capitalize cursor-pointer font-semibold text-sm w-full !py-1 hover:border-slate-500",
            ProductStatusKeys[statusItem]
          )}
        >
          {__(statusItem, 'whizmanage')}
        </option>
      ))}
    </select>
  </div>
  )
}

export default StatusVariationEdit;
