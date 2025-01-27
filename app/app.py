import chainlit as cl


@cl.on_chat_start
async def main(message: cl.Message):
    # Your custom logic goes here...

    # Send a response back to the user
    await cl.Message(
        content=f"Meow",
    ).send()
