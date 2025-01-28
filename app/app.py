import chainlit as cl
import os


@cl.on_chat_start
async def main():
    # Get environment variables
    deployment_name = os.getenv('DEPLOYMENT_NAME', 'Default Name')
    logo_url = os.getenv('LOGO_URL', 'Default URL')
    restaurant_name = os.getenv('RESTAURANT_NAME', 'Default Restaurant')
    restaurant_description = os.getenv('RESTAURANT_DESCRIPTION', 'Default Description')

    # Send a response back to the user
    await cl.Message(
        content=f"""
Deployment: {deployment_name}
Logo URL: {logo_url}
Restaurant: {restaurant_name}
Description: {restaurant_description}
"""
    ).send()
