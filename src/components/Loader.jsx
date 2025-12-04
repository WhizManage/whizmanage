import React from 'react'
import { PuffLoader } from 'react-spinners'

const Loader = () => {
  return (
    <div className='h-full w-full flex flex-col justify-center items-center'>
        <PuffLoader size={100} color='rgb(192 38 211 / var(--tw-bg-opacity))' />
    </div>
  )
}

export default Loader