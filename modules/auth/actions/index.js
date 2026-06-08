"use server";
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export const onBoardUser = async () => {
  try {
    const user = await currentUser();

    if (!user) {
      return { success: false, error: "No authenticated user found" };
    }

    const { id, firstName, lastName, imageUrl, emailAddresses } = user;
    
    // Extract email safely - try multiple sources
    let email = "";
    
    // Try emailAddresses array first
    if (emailAddresses && Array.isArray(emailAddresses) && emailAddresses.length > 0) {
      email = emailAddresses[0].emailAddress;
    } 
    // Try primaryEmailAddress
    else if (user.primaryEmailAddress?.emailAddress) {
      email = user.primaryEmailAddress.emailAddress;
    }

    // Ensure email is never empty
    if (!email || email.trim() === '') {
      email = `user-${id}@clerk.local`;
    }

    const newUser = await db.user.upsert({
      where: {
        clerkId: id,
      },
      update: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        imageUrl: imageUrl || undefined,
        email: email,
      },
      create: {
        clerkId: id,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        imageUrl: imageUrl || undefined,
        email: email,
      },
    });

    return { success: true, user: newUser };
  } catch (error) {
    console.log("OnBoard User Error:", error);
    return { success: false, error: String(error) };
  }
};


export const currentUserRole = async()=>{
  try {
      const user = await currentUser();

    if (!user) {
      return undefined;
    }
    
     const { id} = user;

     const userRole = await db.user.findUnique({
      where:{
        clerkId:id
      },
      select:{
    
        role:true,
      }
     })

      return userRole?.role;
  } catch (error) {
    
    console.log(error)
  }
}

export const getCurrentUserData = async()=>{
  try {
    const user = await currentUser();
    if(!user){
      return undefined;
    }
    const data = await db.user.findUnique({
     where:{
      clerkId:user.id
     },
    });

    return data;
  } catch (error) {
    console.log(error);
    return null;
  }
}
