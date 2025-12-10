// app/api/register/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, password } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { message: "Missing required fields." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing && existing.passwordHash) {
      // User already has a password – they should just log in
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (existing && !existing.passwordHash) {
      // Onboarding might have created this user without a password.
      const updated = await prisma.user.update({
        where: { email },
        data: {
          firstName,
          lastName,
          phone,
          passwordHash,
        },
      });

      return NextResponse.json(
        { message: "Account created.", userId: updated.id },
        { status: 200 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        passwordHash,
      },
    });

    return NextResponse.json(
      { message: "Account created.", userId: user.id },
      { status: 201 }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { message: "Server error. Please try again." },
      { status: 500 }
    );
  }
}

