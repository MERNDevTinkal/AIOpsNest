import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppDispatch } from '../utils/hooks';
import { register as registerAction } from '../store/authSlice';

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export default function Register() {
  const dispatch = useAppDispatch();
  const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = (data: any) => dispatch(registerAction(data));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md">
      <div className="mb-4">
        <label className="block">Email</label>
        <input className="border p-2 w-full" {...register('email')} />
      </div>
      <div className="mb-4">
        <label className="block">Password</label>
        <input type="password" className="border p-2 w-full" {...register('password')} />
      </div>
      <button className="px-4 py-2 bg-blue-600 text-white">Register</button>
    </form>
  );
}
