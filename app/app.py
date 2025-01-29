import chainlit as cl
import os


@cl.on_chat_start
async def main():
    # Get environment variables
    logo_url = os.getenv('LOGO_URL', 'Default URL')
    restaurant_name = os.getenv('RESTAURANT_NAME', 'Default Restaurant')
    restaurant_description = os.getenv('RESTAURANT_DESCRIPTION', 'Default Description')

    # Create image element for logo
    logo_element = cl.Image(url=logo_url, name="restaurant_logo")

    # Send a response back to the user with logo as element
    await cl.Message(
        content=f"""
Restaurant: {restaurant_name}
Description: {restaurant_description}
""",
        elements=[logo_element]
    ).send()


@cl.on_message
async def main(message: cl.Message):
    # Send a dummy response
    await cl.Message(content="This is a dummy response to your message.").send()
